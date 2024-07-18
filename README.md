# Simple Socket Server for file-share obsidian plugin

## Installation

```
docker run -dit -p 3000:3000 jloferer96/obsidian-file-share-server:latest
```

## Summary

The socket server is just used to exchange the files, which are end-to-end encrypted, between two clients and inform other clients about the online status.
