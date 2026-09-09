import {test} from 'node:test';
import assert from 'node:assert/strict';
import {youtubeVideoId,editableContent} from '../src/lib/design.mjs';
import {insertSection} from '../src/lib/canvas-model.mjs';
import {readContent,validateContent} from '../src/lib/content.mjs';

test('YouTube links accept supported share formats but cannot supply arbitrary embed sources',()=>{
  const id='M7lc1UVf-VE';
  for(const url of [`https://youtu.be/${id}?si=shared`,`https://www.youtube.com/watch?v=${id}&t=30`,`https://m.youtube.com/watch?v=${id}`,`https://youtube.com/shorts/${id}`,`https://www.youtube.com/live/${id}`,`https://www.youtube-nocookie.com/embed/${id}`])assert.equal(youtubeVideoId(url),id,url);
  for(const url of ['javascript:alert(1)','//youtube.com/watch?v='+id,'https://youtube.com.example.com/watch?v='+id,'https://youtube.com@evil.example/watch?v='+id,'https://www.youtube.com:123/watch?v='+id,'https://example.com/embed/'+id,'https://www.youtube.com/playlist?list=123','https://youtu.be/bad','<iframe src="https://youtube.com"></iframe>',{},null])assert.equal(youtubeVideoId(url),null,String(url));
});

test('a video can wait privately for its link, and visible video sections must be complete before preview',()=>{
  const content=editableContent(readContent());const section=insertSection(content,'video');
  section.heading='Meet the club';
  assert.deepEqual(validateContent(content,{draft:true}),[]);
  assert.ok(validateContent(content).some(error=>error.includes('video:')));
  section.visible=false;assert.deepEqual(validateContent(content),[]);
  section.videoUrl='https://evil.example/video';assert.ok(validateContent(content,{draft:true}).some(error=>error.includes('video:')));
  section.videoUrl='https://youtu.be/M7lc1UVf-VE';section.visible=true;
  assert.deepEqual(validateContent(content),[]);
});
