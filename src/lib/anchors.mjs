const GENERATED_ID=/^section-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const ANCHOR=/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const CONTACT='section-bb4b953e-a094-43dd-baec-239fd87471e6';
const RESERVED=new Set(['opening','labels','main','canvas-content','first-book-title']);
const reserved=value=>RESERVED.has(value) || /^(?:canvas-|ruslitiki-navigation-)/.test(value);
const hasAnchor=section=>typeof section.anchor==='string' && section.anchor!=='';
const title=section=>[section.heading,section.buttonLabel].find(value=>typeof value==='string' && value.trim())?.trim() || '';

function slug(value){
  let result=value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  if(!result)return 'section';
  if(!/^[a-z]/.test(result))result='section-'+result;
  return result.slice(0,61).replace(/-+$/,'');
}

/** Resolve public links without changing the stable identifiers used by the editor. */
export function sectionAnchors(sections=[]){
  const occupied=new Set(sections.map(section=>section.id));
  for(const section of sections)if(hasAnchor(section))occupied.add(section.anchor);
  const anchors=new Map();
  for(const section of sections){
    if(hasAnchor(section)){anchors.set(section.id,section.anchor);continue;}
    const heading=title(section);
    if(!GENERATED_ID.test(section.id) || (!heading && section.id!==CONTACT)){
      anchors.set(section.id,section.id);continue;
    }
    let base=section.id===CONTACT?'contact':slug(heading);
    // Suffixing cannot escape an entire reserved namespace.
    if(/^(?:canvas-|ruslitiki-navigation-)/.test(base))base=slug('section-'+base);
    let candidate=base,number=2;
    while(occupied.has(candidate) || reserved(candidate)){
      const suffix='-'+number++;
      candidate=base.slice(0,61-suffix.length).replace(/-+$/,'')+suffix;
    }
    occupied.add(candidate);anchors.set(section.id,candidate);
  }
  return anchors;
}

/** Lock a readable default when loading or saving a named section, never while typing. */
export function materializeSectionAnchors(content){
  const sections=content.sections || [];
  const anchors=sectionAnchors(sections);
  for(const section of sections){
    if((!Object.hasOwn(section,'anchor') || section.anchor==='') && GENERATED_ID.test(section.id) && title(section))section.anchor=anchors.get(section.id);
  }
  return content;
}

export function validateSectionAnchors(sections=[]){
  const errors=[],explicit=new Map();
  for(const [index,section] of sections.entries()){
    if(!Object.hasOwn(section,'anchor') || section.anchor==='')continue;
    const value=section.anchor,label=`Section ${index+1} link`;
    if(typeof value!=='string' || value.length>61 || !ANCHOR.test(value)){
      errors.push(`${label}: use up to 61 lowercase letters, numbers and single hyphens, starting with a letter.`);continue;
    }
    if(reserved(value))errors.push(`${label}: “${value}” is reserved for the website or editor. Choose another link.`);
    if(sections.some(other=>other!==section && other.id===value))errors.push(`${label}: “${value}” is already used by another section identifier.`);
    if(explicit.has(value))errors.push(`${label}: “${value}” is already used by another section link.`);
    else explicit.set(value,index);
  }
  return errors;
}
