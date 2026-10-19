// SCRUM-143 disposable local benchmark: 10,000 synthetic properties and units.
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const properties = Array.from({ length: 10_000 }, (_, i) => {
  const lon = (123.88 + (i % 100) * 0.001).toFixed(6);
  const lat = (10.28 + Math.floor(i / 100) * 0.001).toFixed(6);
  return { id: randomUUID(), lon, lat, price: 5000 + (i % 30000) };
});
const values = properties.map(({ id, lon, lat }) =>
  `('${id}','14400000-0000-4000-8000-000000000001','Synthetic benchmark','Fixture','apartment','Test Street','Lahug','Cebu City',extensions.ST_SetSRID(extensions.ST_MakePoint(${lon},${lat}),4326)::extensions.geography,'approved')`,
).join(",\n");
const units = properties.map(({ id, price }) =>
  `('${randomUUID()}','${id}','private_room',${price},true)`,
).join(",\n");
const sql = `BEGIN;
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data) VALUES ('14400000-0000-4000-8000-000000000001','authenticated','authenticated','benchmark@example.invalid','{"role":"landlord","full_name":"Synthetic Benchmark"}'::jsonb);
INSERT INTO public.properties(id,landlord_id,title,description,property_type,street_address,barangay,city,coordinates,status) VALUES ${values};
INSERT INTO public.rental_units(id,property_id,rental_type,monthly_rent,is_available) VALUES ${units};
ANALYZE public.properties;
ANALYZE public.rental_units;
SELECT count(*) AS seeded_properties FROM public.properties WHERE landlord_id='14400000-0000-4000-8000-000000000001';
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM public.search_listings_in_viewport(123.87,10.27,123.99,10.39,NULL,NULL,NULL,NULL,500);
ROLLBACK;
`;
const result = spawnSync("docker", ["exec", "-i", "supabase_db_scrum-143-search-db", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
  input: sql,
  encoding: "utf8",
  maxBuffer: 8 * 1024 * 1024,
});
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
process.exit(result.status ?? 1);
