export async function startEditor({load=()=>import('/studio.js'),root=document}={}){
  try{
    await load();
    return true;
  }catch(error){
    const message='The editor could not load. Restart it from the current project folder, then reload this page.';
    const alert=root.querySelector('#error');
    alert.textContent=message+(error?.message ? '\nDetails: '+error.message : '');
    alert.hidden=false;
    root.querySelector('#canvas-status').textContent=message;
    root.querySelector('#save-state').textContent='Editor did not start';
    return false;
  }
}

if(typeof document!=='undefined')startEditor();
