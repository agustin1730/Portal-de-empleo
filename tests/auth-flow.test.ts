import {test} from "node:test";
import assert from "node:assert/strict";
import {allowedDestination,ownerEmailMatches,validNewPassword} from "../lib/auth-flow.ts";
test("email callbacks reject external and arbitrary redirect destinations",()=>{
 for(const input of ["https://example.test","//example.test","/api/jobs","/password?next=https://example.test",null])assert.equal(allowedDestination(input),"/");
 assert.equal(allowedDestination("/password"),"/password");
});
test("signup is restricted to the configured owner email",()=>{
 const old=process.env.OWNER_EMAIL;
 try{process.env.OWNER_EMAIL="owner@example.test";assert.equal(ownerEmailMatches(" OWNER@example.test "),true);assert.equal(ownerEmailMatches("other@example.test"),false);process.env.OWNER_EMAIL="";assert.equal(ownerEmailMatches("owner@example.test"),false);}
 finally{if(old===undefined)delete process.env.OWNER_EMAIL;else process.env.OWNER_EMAIL=old;}
});
test("new passwords require confirmation and bounded length",()=>{
 assert.equal(validNewPassword("a".repeat(12),"a".repeat(12)),true);
 assert.equal(validNewPassword("short","short"),false);
 assert.equal(validNewPassword("a".repeat(12),"b".repeat(12)),false);
 assert.equal(validNewPassword("a".repeat(129),"a".repeat(129)),false);
});
