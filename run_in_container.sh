#!/usr/bin/env bash

image_name=sorjordet-image
container_name=sorjordet

echo "stopping container"
docker stop $container_name
echo "Removing image: "
docker rm $container_name
echo "Success. Starting build for $image_name."
docker build . -t $image_name
echo "Build successful, creating container: $container_name"
docker run -p 8000:8000 -d --name $container_name --env-file .env $image_name
sleep 2s
echo "First output:"
docker logs $container_name
