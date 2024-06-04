#!/usr/bin/env bash


startpath=$(pwd)
echo $startpath

if [[ ! $startpath == *sorjordet ]] # * is used for pattern matching
then
  echo "Please go to root, can't be bothered to parse harder. Exiting..."
  exit; 
fi

if [ -d "$startpath/Client/__old__bindings" ]; then
    echo "Found old bindings, replacing them with current bindings."
    rm -rf "$startpath/Client/__old__bindings"
fi

if [ -d "$startpath/Client/bindings" ]; then
    echo "Found existing bindings at \"./Client/bindings\", moving them to \"./Client/__old__bindings\""
    mv "$startpath/Client/bindings" "$startpath/Client/__old__bindings" && echo "Success!"
fi


cd "$startpath/Server"

echo "Generating bindings.."
cargo test --quiet && echo "Success"

echo "Moving new bindings.."
mv ./bindings ../Client && echo "Success!"
