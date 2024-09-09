*** Install Chroma ***

# Temporary container #
docker run -d --rm --name chromadb -v ./chroma:/Users/mr.o/chroma -p 8000:8000 -e IS_PERSISTENT=TRUE -e ANONYMIZED_TELEMETRY=TRUE chromadb/chroma:latest 

# Permanent container #
docker run -d --name chromadb -v ./chroma:/Users/mr.o/chroma -p 8000:8000 -e IS_PERSISTENT=TRUE -e ANONYMIZED_TELEMETRY=TRUE chromadb/chroma:latest 
