const fs = require('fs');

let schema = fs.readFileSync('types/project-registration.schema.ts', 'utf8');

schema = schema.replace(
  '  updatedAt: z.coerce.date(),\n});',
  `  updatedAt: z.coerce.date(),
  instructor: z.object({
    id: z.string().cuid(),
    name: z.string(),
  }).nullable().optional(),
});`
);

fs.writeFileSync('types/project-registration.schema.ts', schema);
