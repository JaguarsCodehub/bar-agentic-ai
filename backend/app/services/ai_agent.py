import os
import uuid
from typing import Optional
from langchain_community.utilities import SQLDatabase
from langchain_openai import ChatOpenAI
from langchain_community.agent_toolkits.sql.toolkit import SQLDatabaseToolkit
from langchain.agents.agent_types import AgentType

from app.config import get_settings

settings = get_settings()

def get_db_uri():
    # Convert asyncpg connection string to normal psycopg2
    uri = settings.DATABASE_URL
    if uri.startswith("postgresql+asyncpg://"):
        return uri.replace("postgresql+asyncpg://", "postgresql://", 1)
    return uri

# Setup Database connection for Langchain
db = SQLDatabase.from_uri(get_db_uri())

def run_agent_query(query: str, bar_id: str) -> str:
    """
    Runs an agent query strictly scoped to the bar_id and only allows SELECT queries.
    """
    if not settings.OPENAI_API_KEY:
        return "Error: OPENAI_API_KEY is not configured on the server."

    llm = ChatOpenAI(temperature=0, model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY)
    toolkit = SQLDatabaseToolkit(db=db, llm=llm)
    
    SYSTEM_PREFIX = f"""You are an intelligent data analyst for a bar management system.
Your job is to answer questions about the bar operations using the provided PostgreSQL database.
You must adhere strictly to these rules:
1. ONLY execute SELECT queries. You are completely forbidden from running INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, or any data modification queries.
2. The user asking the question belongs to bar_id = '{bar_id}'.
3. EVERY SQL query you construct MUST include a WHERE clause ensuring `bar_id = '{bar_id}'` for all tables queried.
4. If the question asks for something beyond the scope of bar operations, politely decline.
5. Only use the tables: bars, users, products, suppliers, purchase_orders, stock_movements, shifts, sales_records, daily_reconciliations, loss_reports.
6. Provide a concise, clear answer derived solely from the database query results.
"""

    agent = create_sql_agent(
        llm=llm,
        toolkit=toolkit,
        db=db,
        agent_type=AgentType.OPENAI_FUNCTIONS,
        prefix=SYSTEM_PREFIX,
        top_k=20,
        verbose=True,
        max_execution_time=30, # Prevent long-running agents
        handle_parsing_errors=True
    )

    try:
        response = agent.invoke({"input": query})
        return response.get("output", "I could not find an answer.")
    except Exception as e:
        # In a real app we might log this explicitly
        error_str = str(e)
        if "rate_limit" in error_str.lower():
            return "OpenAI API rate limit exceeded. Please try again later or check your API key quota."
        return f"Sorry, I encountered an error while analyzing the data: {error_str}"
