import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()
chiave = os.getenv("GROQ_API_KEY")

if not chiave:
    print("ERRORE: Non trovo la chiave nel file .env!")
else:
    try:
        llm = ChatGroq(groq_api_key=chiave, model_name="llama-3.3-70b-versatile")
        print("Connessione a Groq in corso...")
        risposta = llm.invoke("Ciao! Se leggi questo messaggio, rispondi con: 'Sistema AI pronto'.")
        print("\n--- RISPOSTA DALL'IA ---")
        print(risposta.content)
        print("------------------------")
    except Exception as e:
        print(f"Errore: {e}")