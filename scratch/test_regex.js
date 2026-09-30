const salutationRegex = /Dear\s+(Sir\/?Ma|Sir|Ma|Madam|Mr\.?|Mrs\.?|Ms\.?)[^<\n]*?,?/gi;

let html = "Dear Sir/Ma, We are pleased to offer you...";
html = html.replace(salutationRegex, "Dear Sir,");
console.log("Test 1:", html);

html = "Dear Ma, We are pleased to offer you...";
html = html.replace(salutationRegex, "Dear Sir,");
console.log("Test 2:", html);

html = "Dear Madam, We are pleased to offer you...";
html = html.replace(salutationRegex, "Dear Sir,");
console.log("Test 3:", html);

html = "Dear Client, We are pleased to offer you...";
html = html.replace(salutationRegex, "Dear Sir,");
console.log("Test 4:", html);
