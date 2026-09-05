from typing import Optional
from langgraph.graph import StateGraph, END
from .state import AgentState
from ai.router import ModelRouter, ModelRoutingError
from ai.inference.interface import AIClientInterface
from verification.interface import VerifierInterface
from tools.registry import ToolRegistry
from vision.interface import VisionClientInterface
from rag.retriever import RAGRetriever

class AgentWorkflow:
    """
    LangGraph agent orchestration layer.
    """
    def __init__(
        self, 
        router: ModelRouter, 
        ai_client: AIClientInterface,
        verifier: Optional[VerifierInterface] = None,
        retriever: Optional[RAGRetriever] = None,
        tool_registry: Optional[ToolRegistry] = None,
        vision_client: Optional[VisionClientInterface] = None
    ):
        self.router = router
        self.ai_client = ai_client
        self.verifier = verifier
        self.retriever = retriever
        self.tool_registry = tool_registry
        self.vision_client = vision_client
        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(AgentState)
        
        workflow.add_node("router_node", self.router_node)
        workflow.add_node("rag_node", self.rag_node)
        workflow.add_node("tool_node", self.tool_node)
        workflow.add_node("vision_node", self.vision_node)
        workflow.add_node("execution_node", self.execution_node)
        workflow.add_node("verification_node", self.verification_node)
        
        workflow.set_entry_point("router_node")
        
        workflow.add_edge("router_node", "rag_node")
        workflow.add_edge("rag_node", "tool_node")
        workflow.add_edge("tool_node", "vision_node")
        workflow.add_edge("vision_node", "execution_node")
        workflow.add_edge("execution_node", "verification_node")
        workflow.add_edge("verification_node", END)
        
        return workflow.compile()

    def router_node(self, state: AgentState) -> AgentState:
        try:
            route = self.router.route(state["capability"])
            state["selected_model"] = route["model"]
        except ModelRoutingError as e:
            errors = state.get("errors", [])
            errors.append(str(e))
            state["errors"] = errors
        return state

    def rag_node(self, state: AgentState) -> AgentState:
        if state.get("errors"): return state
        if self.retriever and state.get("input_data", {}).get("rag_query"):
            try:
                query = state["input_data"]["rag_query"]
                docs = self.retriever.retrieve(query)
                state["retrieved_context"] = docs
            except Exception as e:
                errors = state.get("errors", [])
                errors.append(f"RAG Error: {str(e)}")
                state["errors"] = errors
        return state

    def tool_node(self, state: AgentState) -> AgentState:
        if state.get("errors"): return state
        if self.tool_registry and state.get("input_data", {}).get("tools_to_run"):
            tools_to_run = state["input_data"]["tools_to_run"]
            results = []
            for t_req in tools_to_run:
                try:
                    tool = self.tool_registry.get_tool(t_req["name"])
                    res = tool.execute(**t_req.get("args", {}))
                    results.append({"name": t_req["name"], "result": res})
                except Exception as e:
                    errors = state.get("errors", [])
                    errors.append(f"Tool Error ({t_req['name']}): {str(e)}")
                    state["errors"] = errors
            if results:
                state["tool_results"] = results
        return state

    def vision_node(self, state: AgentState) -> AgentState:
        if state.get("errors"): return state
        if self.vision_client and state.get("input_data", {}).get("image_path"):
            try:
                res = self.vision_client.analyze_image(
                    image_path=state["input_data"]["image_path"],
                    prompt=state["task"],
                    model=state.get("selected_model", "")
                )
                state["vision_results"] = res
            except Exception as e:
                errors = state.get("errors", [])
                errors.append(f"Vision Error: {str(e)}")
                state["errors"] = errors
        return state

    def execution_node(self, state: AgentState) -> AgentState:
        if state.get("errors") or not state.get("selected_model"):
            return state # Skip if errors

        # If vision returned a response, use it and skip general text inference
        if state.get("vision_results") and "response" in state["vision_results"]:
            state["response"] = state["vision_results"]["response"]
            return state

        prompt = state["task"]
        if state.get("retrieved_context"):
            prompt += f"\nContext: {state['retrieved_context']}"
        if state.get("tool_results"):
            prompt += f"\nTool Results: {state['tool_results']}"
            
        try:
            response = self.ai_client.generate(prompt=prompt, model=state["selected_model"])
            state["response"] = response.get("response", str(response))
        except Exception as e:
            errors = state.get("errors", [])
            errors.append(str(e))
            state["errors"] = errors
            
        return state

    def verification_node(self, state: AgentState) -> AgentState:
        if self.verifier:
            result_data = {
                "response": state.get("response"),
                "errors": state.get("errors", [])
            }
            context_data = {
                "retrieved_context": state.get("retrieved_context", [])
            }
            verification = self.verifier.verify(result_data, context_data)
            state["verification"] = verification
        else:
            if state.get("response") and not state.get("errors"):
                state["verification"] = {"status": "passed"}
        return state
        
    def invoke(self, state: AgentState) -> AgentState:
        return self.graph.invoke(state)
