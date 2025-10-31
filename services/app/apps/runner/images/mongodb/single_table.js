var docs = [];
docs.push({ a: 0, b: 5 });
docs.push({ a: 1, b: 2 });
docs.push({ a: 7, b: 5 });
docs.push({ a: 3, b: 1 });
docs.push({ a: 11, b: 3 });
docs.push({ a: 100, b: 200 });
docs.push({ a: 14, b: 3 });

db.sum.insertMany(docs);
