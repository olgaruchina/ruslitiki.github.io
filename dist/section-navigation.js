// Keep both navigation copies in sync with the section being read.
const sectionLinks = [...document.querySelectorAll('[data-nav-link]')];
const sections = [...new Set(sectionLinks.map(link => link.hash))]
  .map(hash => document.querySelector(hash));
let scheduled = false;
function updateCurrentSection() {
  scheduled = false;
  let current = null;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= 160) current = section.id;
  }
  for (const link of sectionLinks) {
    if (link.hash === '#' + current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
function scheduleUpdate() {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(updateCurrentSection);
  }
}
addEventListener('scroll', scheduleUpdate, { passive: true });
addEventListener('resize', scheduleUpdate);
addEventListener('hashchange', scheduleUpdate);
addEventListener('load', scheduleUpdate);
updateCurrentSection();
