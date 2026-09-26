# Модель документа

Документ — обычный JSON. Он целиком описывает макет и данные, сохраняется файлом и передаётся в рендерер.

## Верхний уровень

```ts
interface Document {
  version: number;            // для миграций при изменении схемы
  canvas: Canvas;
  fonts: FontRef[];
  elements: Element[];
  records: Record<string, string>[];
  fields: FieldDef[];         // описания колонок данных
  guides: Guide[];            // пользовательские направляющие (линейка), см. ниже
}

interface Canvas {
  w: number;                  // мм, размер в обрезе
  h: number;
  bleed: number;              // мм, вылет под подрезку
  safe: number;               // мм, поле, за которое не стоит заходить
  background: string;         // цвет или "transparent"
}
```

## Элементы

Общая часть у всех типов:

```ts
interface Base {
  id: string;
  name: string;               // отображается в списке слоёв
  type: "text" | "rect" | "ellipse" | "line" | "image";
  x: number; y: number;       // мм, левый верхний угол относительно обреза
  w: number; h: number;
  rotation: number;           // градусы
  locked: boolean;
  visible: boolean;
}
```

### Текст

```ts
interface TextElement extends Base {
  type: "text";
  content: string;            // "Имя" или "{{name}}" или "ID: {{badgeId}}"
  font: string;               // семейство из fonts
  weight: "regular" | "bold";
  size: number;               // мм по кеглю
  minSize: number;            // нижняя граница при автоподгонке
  lineHeight: number;
  tracking: number;           // межбуквенный интервал, мм
  align: "left" | "center" | "right";
  valign: "top" | "middle" | "baseline";
  color: string;
  fit: "shrink" | "clip" | "wrap" | "none";
  transform: "none" | "upper" | "lower";
}
```

`fit` — ключевое свойство, ради которого проект затевался:

- `shrink` — уменьшать кегль до `minSize`, потом обрезать многоточием
- `clip` — сразу обрезать многоточием
- `wrap` — переносить по словам в пределах `h`
- `none` — выпускать за границы как есть

### Фигуры

```ts
interface RectElement extends Base {
  type: "rect";
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;        // мм
  radius: number;             // мм
}
```

`ellipse` и `line` устроены так же, у линии вместо заливки только обводка.

### Изображение

```ts
interface ImageElement extends Base {
  type: "image";
  src: string;                // data URI или "{{photo}}"
  fit: "cover" | "contain" | "fill";
}
```

## Направляющие

```ts
interface Guide {
  id: string;
  axis: "x" | "y";
  positionMm: number;
}
```

Тянутся с линейки на холст (как в Фигме) — дополнительные цели примагничивания сверх обреза/вылета/безопасного поля/других элементов. Не печатаются и не попадают в `render()` — это редакторская сущность, но живёт в документе, а не в состоянии редактора: так она проходит через undo/redo и сохраняется вместе с макетом.

## Данные

```ts
interface FieldDef {
  key: string;                // "name", подставляется как {{name}}
  label: string;              // "Имя" — заголовок колонки в таблице
  sample: string;             // пример для предпросмотра пустого макета
}
```

`records` — массив плоских объектов. Ключи соответствуют `fields[].key`.

## Плейсхолдеры

В `content` и `src` подставляются значения записи по шаблону `{{key}}`. Одна строка может содержать несколько: `"{{city}}, {{country}}"`. Неизвестный ключ подставляется пустой строкой, а не текстом плейсхолдера.

## Шрифты

```ts
interface FontRef {
  family: string;
  weight: "regular" | "bold";
  source: "bundled" | "user";
  file?: string;              // путь или data URI для user
}
```

Встроенные шрифты — только с открытой лицензией. Пользовательские живут в памяти сессии и сохраняются в проект как data URI, чтобы файл открывался на другой машине.

## Что рендерер делает с документом

```ts
function render(
  doc: Document,
  record: Record<string, string>,
  opts: { outlines: boolean; bleed: boolean; marks: boolean }
): string   // строка с SVG
```

Единственная точка, где документ превращается в картинку. Из неё же растут PNG (через canvas) и PDF (через pdf-lib).

`outlines: true` переводит текст в кривые через opentype.js — тогда SVG не зависит от шрифтов на чужой машине.
