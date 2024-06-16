export enum CastlingEnum {
  NONE = 0,
  WK = 1,
  WQ = 2,
  BK = 4,
  BQ = 8,

  White = WK | WQ,
  Black = BK | BQ,
  All = White | Black
}
