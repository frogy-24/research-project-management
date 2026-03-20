const fs = require('fs');
let code = fs.readFileSync('types/project-registration.schema.ts', 'utf8');

code = code.replace(
  '  updatedAt: true,\n});',
  '  updatedAt: true,\n  instructor: true,\n});'
);

fs.writeFileSync('types/project-registration.schema.ts', code);
