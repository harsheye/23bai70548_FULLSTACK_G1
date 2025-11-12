import React, { useState } from 'react';
import './App.css';

function App() {

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  

  function onclick_data(e){
    e.preventDefault();
    
    console.log(user, pass);

    if(user === "Subh" && pass === "1234"){
      document.getElementById("success").innerText = `Welcome ${user} with pass ${pass}`;
      document.getElementById("error").innerText = "";
    }else{
      document.getElementById("error").innerText = `Error User ${user} not found`;
      document.getElementById("success").innerText = "";
    }

  };

  return (
    <div style={{display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
      height: "100vh",
      backgroundColor: "#f5f7fa" }}>
      <form>
        <h1>Login Form</h1>
        <input type="text" placeholder='Username' value = {user} onChange={(e)=>setUser(e.target.value)}/>
        <br />
        <input type="password" placeholder='Password' value = {pass} onChange={(e)=>setPass(e.target.value)}/>
        <br />
        <button type='submit'onClick={onclick_data}>Login</button>
      </form>
      <h1 id="success" style={{color: "green"}}></h1>
      <h1 id="error" style={{color: "red"}}></h1>
    </div>
  );
}

export default App;
