ALTER TABLE grupo_conviviente
  ADD COLUMN IF NOT EXISTS ocupacion varchar,
  ADD COLUMN IF NOT EXISTS nivel_educativo varchar;

ALTER TABLE grupo_conviviente
  ADD CONSTRAINT chk_gc_ocupacion
  CHECK (ocupacion IS NULL OR ocupacion IN ('Empleado/a', 'Desempleado/a', 'Trabajo informal', 'Jubilado/a', 'Ama/o de casa', 'Estudiante', 'Otro')),
  ADD CONSTRAINT chk_gc_nivel_educativo
  CHECK (nivel_educativo IS NULL OR nivel_educativo IN ('Sin instrucción', 'Primario incompleto', 'Primario completo', 'Secundario incompleto', 'Secundario completo', 'Terciario/universitario incompleto', 'Terciario/universitario completo'));
