from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Any

from app.models import User
from app.middleware.auth import get_current_user
from app.services.ai_agent import run_agent_query

router = APIRouter(prefix="/ai", tags=["AI Agent"])

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    data: ChatRequest,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Chat with the AI agent to query business data.
    Only allows read-only access scoped to the user's specific bar_id.
    """
    if not current_user.bar_id:
        raise HTTPException(status_code=400, detail="User is not associated with any bar.")
        
    response_text = run_agent_query(data.query, str(current_user.bar_id))
    
    return ChatResponse(response=response_text)
