export const filter=(items,q,status)=>items.filter(x=>(!q||JSON.stringify(x).toLocaleLowerCase().includes(q.toLocaleLowerCase()))&&(!status||x.status===status));
