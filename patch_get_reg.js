const fs = require('fs');
let code = fs.readFileSync('app/api/my-project-registrations/route.ts', 'utf8');

code = code.replace(
  'orderBy: { createdAt: "desc" },',
  `orderBy: { createdAt: "desc" },
      include: {
        instructor: { select: { id: true, name: true } },
      },`
);

fs.writeFileSync('app/api/my-project-registrations/route.ts', code);
