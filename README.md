# Simple Socket Server for file-share obsidian plugin

## Installation

```bash
docker run -dit -p 3000:3000 -e SOCKET_PORT=3000 -e RATE_LIMITER_WINDOW_MS=900000 -e RATE_LIMITER_MAX_REQUESTS=10 -e RATE_LIMITER_MAX_CONNECTIONS=5 -e CERT_PEM_PATH=path-to-your-cert-file -e KEY_PEM_PATH=path-to-your-key-file jloferer96/obsidian-file-share-server:latest
```


## Summary

The socket server is just used to exchange the files, which are end-to-end encrypted, between two clients and inform other clients about the online status.
Used by [Obsidian FileShare](https://github.com/muckmuck96/obsidian-file-share). Further information can be found in the [enhanced settings](https://muckmuck96.github.io/obsidian-file-share/enhanced-server-configuration.html) of the documentation.
