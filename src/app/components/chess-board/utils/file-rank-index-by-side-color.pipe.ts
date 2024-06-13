import { Pipe, type PipeTransform } from '@angular/core';

/** Handles `row` _(rank)_ or `col` _(file)_ index transforming it
 *  to right index to match chessboard side retrospective. */
@Pipe({
  name: 'fileRankIndexBySideColor',
  pure: true,
  standalone: true,
})
export class FileRankIndexBySideColorPipe implements PipeTransform {

  transform(fileRankIndex: number, isBlack: boolean): number {
    return isBlack ? (7 - fileRankIndex) : fileRankIndex;
  }

}
