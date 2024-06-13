import { Pipe, type PipeTransform } from '@angular/core';
import { SquareIndex } from '../../../types/square-index';

@Pipe({
  name: 'squareIndexBySideColor',
  pure: true,
  standalone: true,
})
export class SquareIndexBySideColorPipe implements PipeTransform {

  transform(index: SquareIndex, isBlack: boolean): SquareIndex {
    return isBlack
      ? new SquareIndex(SquareIndex.MAX_VALUE - index.value)
      : index;
  }

}
