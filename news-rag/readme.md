*** Install Chroma ***

# Temporary container #
docker run -d --rm --name chromadb -v ./chroma:/Users/mr.o/chroma -p 8000:8000 -e IS_PERSISTENT=TRUE -e ANONYMIZED_TELEMETRY=TRUE chromadb/chroma:latest 

# Permanent container #
docker run -d --name chromadb -v ./chroma:/Users/mr.o/chroma -p 8000:8000 -e IS_PERSISTENT=TRUE -e ANONYMIZED_TELEMETRY=TRUE chromadb/chroma:latest 

# Cloudflare tunnel # 
https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/

Created tunnel newsvectordb with id f59d1519-06c1-4172-a194-c59e8067c98e

cloudflared tunnel route dns f59d1519-06c1-4172-a194-c59e8067c98e newsvectordb

cloudflared tunnel run f59d1519-06c1-4172-a194-c59e8067c98e