import { useEffect, useState } from "react";
import { fetchHello } from "./services/api";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchHello().then(data => setMessage(data.message));
  }, []);

  return <h1>{message}</h1>;
}

export default App;
