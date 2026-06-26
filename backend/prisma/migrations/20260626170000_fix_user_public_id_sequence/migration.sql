DO $$
DECLARE
  user_count INTEGER;
  min_public_id INTEGER;
  max_public_id INTEGER;
BEGIN
  SELECT COUNT(*), MIN("publicId"), MAX("publicId")
  INTO user_count, min_public_id, max_public_id
  FROM "User";

  IF user_count = 0 THEN
    PERFORM setval('"User_publicId_seq"', 1, false);
    RETURN;
  END IF;

  IF min_public_id = 2
    AND NOT EXISTS (SELECT 1 FROM "User" WHERE "publicId" = 1)
    AND max_public_id - min_public_id + 1 = user_count
  THEN
    UPDATE "User" SET "publicId" = -"publicId";
    UPDATE "User" SET "publicId" = ABS("publicId") - 1;
  END IF;

  PERFORM setval(
    '"User_publicId_seq"',
    GREATEST((SELECT COALESCE(MAX("publicId"), 1) FROM "User"), 1),
    true
  );
END $$;
