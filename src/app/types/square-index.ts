export class SquareIndex {
  static readonly MIN_VALUE = 0;
  static readonly MAX_VALUE = 63;

  readonly value: number;

  constructor(value: number) {
    this.value = value;
  }

  isValid(): boolean {
    return SquareIndex.validate(this.value);
  }

  isEquals(squareIndex: SquareIndex): boolean {
    return this.value == squareIndex.value;
  }

  get fileIndex(): number {
    return SquareIndex.fileIndex(this.value);
  }

  get rankIndex(): number {
    return SquareIndex.rankIndex(this.value);
  }

  static fileIndex(index: number): number {
    return index % 8;
  }

  static rankIndex(index: number): number {
    return ~~(index / 8);
  }

  static validate(index: number): boolean {
    return index >= SquareIndex.MIN_VALUE
        && index <= SquareIndex.MAX_VALUE;
  }

  static createEmpty(): SquareIndex {
    return new SquareIndex(-1);
  }

  static fromFileRank(fileIndex: number, rankIndex: number): SquareIndex {
    return new SquareIndex(rankIndex * 8 + fileIndex);
  }
}
