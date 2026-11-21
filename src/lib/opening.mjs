export const DEFAULT_SIGNUP_BENEFITS='Weekly videos\nReading guides and additional materials\nAccess to the member chat\nA guided discussion at the end of the month';
export const DEFAULT_WAITLIST_NOTE='If you join the waitlist, you will receive an email with the link to join the book club as soon as the book club is open for that month.';
export const signupHeadingFor=content=>content.signupHeading??'';
export const signupBenefitsFor=content=>content.signupBenefits??DEFAULT_SIGNUP_BENEFITS;
export const waitlistNoteFor=content=>content.waitlistNote??DEFAULT_WAITLIST_NOTE;
export const bookDescriptionFor=book=>book.description??book.note??'';

export function prepareOpeningFields(draft){
  if(draft.introHeading===undefined && typeof draft.heading==='string' && draft.heading.trim() && !/^Russian literature, but make it fun[.!]?$/.test(draft.heading.trim())){
    draft.introHeading=draft.heading;
    if(draft.richText?.['opening:heading'])draft.richText['opening:introHeading']=structuredClone(draft.richText['opening:heading']);
  }
  if(draft.signupHeading===undefined){
    const removed='Fall in love with Russian classics, one book at a time. Discover the stories behind the stories.';
    const lines=(draft.introduction??'').split('\n');
    if(lines.some(line=>line.trim()===removed)){
      draft.signupHeading=lines.filter(line=>line.trim()!==removed).join(' ').trim();
      draft.introduction='';
      const intro=draft.richText?.['opening:introduction'];
      if(intro){
        const kept=intro.blocks.filter(block=>block.runs.map(run=>run.text).join('').trim()!==removed);
        const runs=kept.flatMap((block,index)=>[...(index?[{text:' '}]:[]),...block.runs]);
        if(runs.map(run=>run.text).join('')===draft.signupHeading)draft.richText['opening:signupHeading']={blocks:[{type:'paragraph',runs}]};
        delete draft.richText['opening:introduction'];
      }
    }
  }
  draft.signupHeading=signupHeadingFor(draft);
  draft.signupBenefits=signupBenefitsFor(draft);
  draft.waitlistNote=waitlistNoteFor(draft);
  draft.book.description=bookDescriptionFor(draft.book);
  return draft;
}
