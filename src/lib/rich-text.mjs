const record=value=>value!==null && typeof value==='object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value));
const blockTypes=new Set(['paragraph','bullet','number']);
const escape=value=>value.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

/** Validate the complete structure; HTML, attributes and unknown properties are never accepted. */
export function validateRichText(doc,{inline=false}={}){
  const errors=[];
  const keys=(value,allowed,label)=>{
    if(!record(value)){errors.push(`${label}: expected an object.`);return false;}
    const properties=Object.getOwnPropertyDescriptors(value);
    if(Reflect.ownKeys(properties).some(key=>!allowed.includes(key)))errors.push(`${label}: unsupported property.`);
    if(Object.values(properties).some(property=>!Object.hasOwn(property,'value'))){errors.push(`${label}: accessors are not supported.`);return false;}
    return true;
  };
  if(!keys(doc,['blocks'],'Rich text'))return errors;
  if(!Array.isArray(doc.blocks) || doc.blocks.length<1 || doc.blocks.length>500)return [...errors,'Rich text: use between 1 and 500 blocks.'];
  if(inline && doc.blocks.length!==1)errors.push('Inline rich text: use one paragraph.');
  let length=0;
  for(const block of doc.blocks){
    if(!keys(block,['type','runs'],'Text block'))continue;
    if(!blockTypes.has(block.type) || (inline && block.type!=='paragraph'))errors.push('Text block: unsupported paragraph or list type.');
    if(!Array.isArray(block.runs) || block.runs.length>1000){errors.push('Text block: use at most 1000 text runs.');continue;}
    for(const run of block.runs){
      if(!keys(run,['text','bold','italic'],'Text run'))continue;
      if(typeof run.text!=='string'){errors.push('Text run: expected text.');continue;}
      length+=run.text.length;
      if(/[\r\n]/.test(run.text))errors.push('Text run: put line breaks between paragraphs.');
      for(const mark of ['bold','italic'])if(Object.hasOwn(run,mark) && typeof run[mark]!=='boolean')errors.push(`Text run: ${mark} must be true or false.`);
    }
  }
  if(length>50000)errors.push('Rich text: use at most 50,000 characters.');
  return errors;
}

export function fromPlainText(value){
  return {blocks:String(value??'').replace(/\r\n?/g,'\n').split('\n').map(text=>({type:'paragraph',runs:text?[{text}]:[]}))};
}

export function plainText(doc){
  if(validateRichText(doc).length)return '';
  return doc.blocks.map(block=>block.runs.map(run=>run.text).join('')).join('\n');
}

/** Return only a small set of generated tags, with every text run escaped. */
export function renderRichText(doc,{inline=false}={}){
  if(validateRichText(doc,{inline}).length)return '';
  const runs=block=>block.runs.map(run=>{
    let text=escape(run.text);
    if(run.italic)text=`<em>${text}</em>`;
    if(run.bold)text=`<strong>${text}</strong>`;
    return text;
  }).join('');
  if(inline)return runs(doc.blocks[0]);
  let html='',list=null;
  for(const block of doc.blocks){
    const next=block.type==='bullet'?'ul':block.type==='number'?'ol':null;
    if(list!==next){if(list)html+=`</${list}>`;if(next)html+=`<${next}>`;list=next;}
    html+=next?`<li>${runs(block)||'<br>'}</li>`:`<p>${runs(block)||'<br>'}</p>`;
  }
  if(list)html+=`</${list}>`;
  return html;
}
