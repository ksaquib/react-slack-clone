import React from "react";
import "./App.css";
import { Grid } from "semantic-ui-react";
import ColorPanel from "./ColorPanel/ColorPanel";
import SidePanel from "./SidePanel/SidePanel";
import Messages from "./Messages/Messages";
import MetaPanel from "./MetaPanel/MetaPanel";

const App = () => (
  <Grid>
    <ColorPanel />
    <SidePanel />
    <Messages />
    <MetaPanel />
  </Grid>
);

export default App;
