// Both menus follow the same visible section targets as the rendered page.
const links=[...document.querySelectorAll('[data-nav-link]')];
const sections=[...new Set(links.map(link=>link.hash))].map(hash=>document.querySelector(hash)).filter(Boolean);
let scheduled=false;
function update(){
  scheduled=false;
  let current=null;
  const atEnd=window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-2;
  for(const section of sections){
    const top=section.getBoundingClientRect().top;
    if(top<=160 || (atEnd && top<window.innerHeight))current=section.id;
  }
  for(const link of links){
    if(link.hash==='#'+current)link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  }
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',schedule);
addEventListener('hashchange',schedule);
addEventListener('load',schedule);
update();
