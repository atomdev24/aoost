/** The password screen: dark workspace colours, no dependencies. */
export const loginPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>aoost / Editor</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:20px;background:#141416;color:#ECE9E3;font:14px Inter,system-ui,sans-serif}
form{width:min(360px,100%);padding:24px;display:flex;flex-direction:column;gap:14px;background:#1C1C1F;border:1px solid #34343A;border-radius:14px}
h1{margin:0;font-size:18px;font-weight:600}h1 span{color:#A8A39A;font-weight:400}
label{font-size:12px;font-weight:500;color:#CFC8BB}
input{height:44px;padding:0 12px;border:1px solid #45454C;border-radius:8px;background:#141416;color:#ECE9E3;font:inherit;font-size:16px}
button{height:44px;border:0;border-radius:8px;background:#E2683A;color:#141414;font:inherit;font-weight:600;cursor:pointer}
input:focus-visible,button:focus-visible{outline:2px solid #E2683A;outline-offset:2px}
p{margin:0;min-height:18px;font-size:13px;color:#E2683A}
</style></head><body>
<form id="f"><h1>aoost <span>/ Editor</span></h1>
<label for="p">Password</label><input id="p" type="password" autocomplete="current-password" required autofocus>
<button type="submit">Open the editor</button><p id="e" role="alert"></p></form>
<script>
document.getElementById("f").addEventListener("submit",async function(ev){ev.preventDefault();var e=document.getElementById("e");e.textContent="";
try{var r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:document.getElementById("p").value})});
var d=await r.json();if(d.ok){location.href="/admin/"}else{e.textContent=d.error||"That did not work."}}catch(x){e.textContent="Could not reach the server."}});
</script></body></html>`;
