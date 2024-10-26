# Sørjordet
> https://sørjordet.no

Sorjordet is a web app for my family farm, where we can track harvest data in an interactive manner. It allows us to plot the fields we harvest onto a map, and group the fields by area.


The frontend is built in Typescript with Solid.js, and OpenLayers for maps. 
The backend is built in Rust, using the Axum framework and various other supporting libraries. 
The backend implements user authentication with argon2 password hashing and JWT tokens.

![sorjordet.no screenshot](assets/ReadmeSkjermbilde.jpg)
