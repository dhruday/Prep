import streamlit as st
from openai import OpenAI
import chromadb

class StreamlitRAG:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./db")
        self.collection = self.client.get_or_create_collection("docs")
        self.llm = OpenAI()
    
    def run(self):
        st.title("📚 Document Q&A")
        
        # Sidebar for document upload
        with st.sidebar:
            uploaded_file = st.file_uploader("Upload document", type=['txt', 'pdf'])
            if uploaded_file and st.button("Index"):
                with st.spinner("Indexing..."):
                    self.index_document(uploaded_file)
                st.success("Indexed!")
        
        # Chat interface
        if 'messages' not in st.session_state:
            st.session_state.messages = []
        
        for msg in st.session_state.messages:
            with st.chat_message(msg['role']):
                st.write(msg['content'])
        
        if prompt := st.chat_input("Ask about your documents"):
            st.session_state.messages.append({'role': 'user', 'content': prompt})
            
            with st.chat_message('user'):
                st.write(prompt)
            
            with st.chat_message('assistant'):
                response = self.rag(prompt)
                st.write(response['answer'])
                
                with st.expander("Sources"):
                    for source in response['sources']:
                        st.caption(source)
            
            st.session_state.messages.append({
                'role': 'assistant',
                'content': response['answer']
            })

app = StreamlitRAG()
app.run()