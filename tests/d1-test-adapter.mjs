import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
class Statement{constructor(db,sql,args=[]){this.db=db;this.sql=sql;this.args=args;}bind(...args){return new Statement(this.db,this.sql,args);}async first(){return this.db.prepare(this.sql).get(...this.args)||null;}async all(){return {results:this.db.prepare(this.sql).all(...this.args)};}async run(){const r=this.db.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes)}};}}
export class TestD1{
 constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(readFileSync(new URL('../cloudflare/staging-schema.sql',import.meta.url),'utf8'));this.db.exec(readFileSync(new URL('../cloudflare/migrations/0001_signed_licensing.sql',import.meta.url),'utf8'));this.queue=Promise.resolve();}
 prepare(sql){return new Statement(this.db,sql);}
 async batch(statements){const run=async()=>{this.db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());this.db.exec('COMMIT');return results;}catch(e){this.db.exec('ROLLBACK');throw e;}};const operation=this.queue.then(run);this.queue=operation.catch(()=>{});return operation;}
}
