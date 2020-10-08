import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import createLibp2p from "./utils/p2p/libp2p";

ReactDOM.render(
  <React.StrictMode>
    <App createLibp2p={createLibp2p} />
  </React.StrictMode>,
  document.getElementById("root"),
);
