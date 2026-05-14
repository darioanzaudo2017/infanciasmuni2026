ALTER TABLE ninos
  ADD CONSTRAINT chk_ninos_genero
  CHECK (genero IS NULL OR genero IN ('Masculino', 'Femenino', 'Otro'));
