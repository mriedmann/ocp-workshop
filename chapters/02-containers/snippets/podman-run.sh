#!/bin/bash
# Common podman run patterns for the workshop

# Interactive UBI shell
podman run -it --rm ubi9/ubi-minimal bash

# Detached with port mapping
podman run -d -p 8080:8080 --name web workshop/lab22:v1

# With resource limits
podman run -d --memory=256m --cpus=0.5 --name limited nginx

# With environment variables
podman run -d \
  -e LOG_LEVEL=debug \
  -e APP_PORT=8080 \
  --name configured \
  workshop/lab22:v1

# Inspect running containers
podman ps
podman inspect web | python3 -m json.tool | grep -A3 "NetworkSettings"
