export const DESIGN_OPTIONS = {
  composition: { split: 'Introduction beside the book', 'book-left': 'Book beside the introduction', stacked: 'One column', centered: 'Centred introduction' },
  width: { compact: 'Compact', standard: 'Standard', wide: 'Wide' },
  spacing: { compact: 'Compact', comfortable: 'Comfortable', airy: 'Airy' },
  logoSize: { small: 'Small', medium: 'Medium', large: 'Large' },
  headingSize: { modest: 'Modest', large: 'Large', display: 'Extra large' },
  headingFont: { literata: 'Literata — literary serif', golos: 'Golos Text — clean sans serif' },
  bodyFont: { golos: 'Golos Text — clean sans serif', literata: 'Literata — literary serif' },
  buttonStyle: { soft: 'Soft corners', square: 'Square', pill: 'Rounded', outline: 'Outline' },
  artworkPlacement: { 'below-title': 'Below the book title', 'above-title': 'Above the book title', 'below-note': 'Below the description' },
  artworkSize: { full: 'Full width', medium: 'Medium', small: 'Small' },
};
export const DESIGN_DEFAULTS = {
  composition:'split', width:'standard', spacing:'comfortable', logoSize:'large', headingSize:'large',
  headingFont:'literata', bodyFont:'golos', bodySize:18, buttonStyle:'soft',
  background:'#b4cdf6', ink:'#141321', accent:'#23156b', artworkPlacement:'below-title', artworkSize:'full',
};
export const PALETTES = {
  blue:{label:'Ruslitiki blue',background:'#b4cdf6',ink:'#141321',accent:'#23156b'},
  white:{label:'White & indigo',background:'#ffffff',ink:'#141321',accent:'#23156b'},
  night:{label:'Evening reading',background:'#161b2c',ink:'#f5f7fc',accent:'#c3d7ff'},
};
export const SECTION_OPTIONS = {
  width:{reading:'Reading width',full:'Full width',narrow:'Narrow'},
  align:{left:'Left',center:'Centre',right:'Right'},
  tone:{plain:'Plain',panel:'Bordered',accent:'Accent colour'},
  layout:{single:'One column',columns:'Two text columns'},
  imageLayout:{left:'Image on the left',right:'Image on the right',above:'Image above text'},
  imageRatio:{auto:'Original proportions',landscape:'Landscape crop',square:'Square crop',portrait:'Portrait crop'},
};
export const SECTION_TYPES = {text:'Text',faq:'Question and answer',image:'Image and text',quote:'Quote'};
export const MAX_SECTIONS = 12;

export function normalizedSections(sections=[]) {
  return sections.map((section,index)=>({width:'reading',align:'left',tone:'plain',layout:'single',...section,id:section.id || `section-${index+1}`}));
}
export function designFor(content) {
  const ids=normalizedSections(content.sections).map(section=>section.id);
  const existing=content.design?.blockOrder || ['opening',...ids];
  const valid=new Set(['opening',...ids]);
  const order=[...new Set(existing.filter(id=>valid.has(id)))];
  for(const id of valid)if(!order.includes(id))order.push(id);
  return {...DESIGN_DEFAULTS,...content.design,blockOrder:order};
}
export function editableContent(content) {
  const draft=structuredClone(content);
  draft.sections=normalizedSections(draft.sections);
  draft.design=designFor(draft);
  return draft;
}
export function contrast(first,second) {
  const luminance=hex=>{
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(value=>value<=0.04045 ? value/12.92 : ((value+0.055)/1.055)**2.4);
    return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
  };
  const a=luminance(first),b=luminance(second);
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}
export function validateDesign(content) {
  const errors=[];
  const input=content.design;
  if(input===undefined)return errors;
  if(!input || typeof input!=='object' || Array.isArray(input))return ['Layout & style: expected a group of settings.'];
  for(const key of Object.keys(input))if(!Object.hasOwn(DESIGN_DEFAULTS,key) && key!=='blockOrder')errors.push(`Layout & style: unknown setting “${key}”.`);
  for(const [key,choices] of Object.entries(DESIGN_OPTIONS))if(input[key]!==undefined && (typeof input[key]!=='string' || !Object.hasOwn(choices,input[key])))errors.push(`Layout & style: choose a supported ${key}.`);
  if(input.bodySize!==undefined && (!Number.isInteger(input.bodySize) || input.bodySize<16 || input.bodySize>22))errors.push('Text size: choose a whole number from 16 to 22.');
  for(const key of ['background','ink','accent'])if(input[key]!==undefined && (typeof input[key]!=='string' || !/^#[0-9a-f]{6}$/i.test(input[key])))errors.push(`Colours: ${key} must be a six-digit hex colour, such as #b4cdf6.`);
  const design={...DESIGN_DEFAULTS,...input};
  if(['background','ink','accent'].every(key=>typeof design[key]==='string' && /^#[0-9a-f]{6}$/i.test(design[key]))){
    if(contrast(design.background,design.ink)<4.5)errors.push('Colours: text needs more contrast with the page background. Choose a darker text colour or a lighter background (or the reverse).');
    if(contrast(design.background,design.accent)<4.5)errors.push('Colours: the accent needs more contrast with the page background for readable outline buttons.');
  }
  if(input.blockOrder!==undefined){
    const expected=['opening',...normalizedSections(content.sections).map(section=>section.id)];
    if(!Array.isArray(input.blockOrder) || input.blockOrder.length!==expected.length || new Set(input.blockOrder).size!==expected.length || expected.some(id=>!input.blockOrder.includes(id)))errors.push('Page order: include the introduction and every content block exactly once.');
  }
  return errors;
}
export function designVariables(design) {
  const heading={literata:"'Literata',Georgia,serif",golos:"'Golos Text',system-ui,sans-serif"};
  const values={
    '--page-bg':design.background,'--ink':design.ink,'--indigo':design.accent,
    '--button-ink':contrast(design.accent,'#ffffff')>=contrast(design.accent,'#000000')?'#ffffff':'#000000',
    '--heading-font':heading[design.headingFont],'--body-font':heading[design.bodyFont],
    '--copy-size':`${design.bodySize/16}rem`,
    '--page-width':{compact:'1050px',standard:'1440px',wide:'1680px'}[design.width],
    '--logo-width':{small:'40rem',medium:'56rem',large:'70rem'}[design.logoSize],
    '--section-space':{compact:'clamp(1.75rem,3vw,3rem)',comfortable:'clamp(2.5rem,5vw,4.8rem)',airy:'clamp(3.5rem,7vw,6.5rem)'}[design.spacing],
    '--heading-size':{modest:'clamp(2.2rem,3.5vw,3rem)',large:'clamp(2.4rem,4.2vw,3.85rem)',display:'clamp(2.7rem,5.5vw,4.8rem)'}[design.headingSize],
    '--art-width':{small:'58%',medium:'78%',full:'100%'}[design.artworkSize],
  };
  return Object.entries(values).map(([key,value])=>`${key}:${value}`).join(';');
}
