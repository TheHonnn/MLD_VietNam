import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowFixture} from './fixtures/workflow.mjs';

test('unusable quiz configuration never consumes a customer attempt',async t=>{
  const f=await workflowFixture(),{db,id,request}=f;
  try{
    const cases=[
      {name:'null options',options:null},
      {name:'scalar options',options:'Not a collection'},
      {name:'empty options',options:[]},
      {name:'only one option',options:['Only option']},
      {name:'nested option value',options:{A:{text:'Nested'},B:'Other'}},
      {name:'blank option text',options:['  ','Other']},
      {name:'missing correct option',correct:'Z'},
      {name:'blank question',question:'  '},
      {name:'negative passing score',passing:-1},
      {name:'unreachable passing score',passing:11},
    ];
    for(const[index,item]of cases.entries())await t.test(item.name,async()=>{
      const quizId=id(700+index),questionId=id(750+index);
      await db.query('INSERT INTO course_quizzes(id,course_id,title,passing_score) VALUES($1,$2,$3,$4)',[quizId,id(22),item.name,item.passing??7]);
      await db.query('INSERT INTO quiz_questions(id,quiz_id,question_number,question_text,options,correct_option) VALUES($1,$2,1,$3,$4::jsonb,$5)',[questionId,quizId,item.question??'Configured question',JSON.stringify(Object.hasOwn(item,'options')?item.options:['First','Second']),item.correct??'A']);
      const result=await request(`/courses/${id(22)}/quiz/start`,{method:'POST',body:{quizId,enrollmentId:id(29)}});
      assert.equal(result.status,409,item.name);
      assert.equal((await db.query('SELECT count(*)::int AS count FROM miniapp_quiz_attempts WHERE quiz_id=$1',[quizId])).rows[0].count,0);
    });
    await t.test('valid attempt remains resumable if the live question is edited later',async()=>{
      const body={quizId:id(26),enrollmentId:id(29)};
      const started=await request(`/courses/${id(22)}/quiz/start`,{method:'POST',body});
      assert.equal(started.status,200);
      await db.query("UPDATE quiz_questions SET options='[]'::jsonb WHERE id=$1",[id(27)]);
      const resumed=await request(`/courses/${id(22)}/quiz/start`,{method:'POST',body});
      assert.equal(resumed.status,200);assert.equal(resumed.data.attempt.id,started.data.attempt.id);
      assert.deepEqual(resumed.data.quiz.questions,started.data.quiz.questions);
    });
  }finally{await f.close();}
});
