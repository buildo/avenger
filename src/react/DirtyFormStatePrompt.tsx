import * as React from 'react';
import { constNull } from 'fp-ts/lib/function';
import { declareQueries } from './declareQueries';
// @ts-ignore: to avoid TS4023
import { DeclareQueriesReturn } from './declareQueries';
import {
  pendingUpdateLocation,
  doResolvePendingUpdateLocation,
  requestConfirmationToUpdateLocation
} from '../browser/location';

const queries = declareQueries({ pendingUpdateLocation });

type Props = {
  renderConfirmation: (
    onDismiss: () => void,
    onConfirm: () => void
  ) => NonNullable<React.ReactNode>;
} & typeof queries.Props;

class DirtyFormStatePrompt extends React.Component<Props> {
  unblock: () => void = () => {};

  componentDidMount() {
    window.addEventListener('beforeunload', this.onBeforeUnload);
    this.unblock = requestConfirmationToUpdateLocation();
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    this.unblock();
  }

  onBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = '';
  };

  render() {
    return this.props.queries.fold(
      constNull,
      constNull,
      ({ pendingUpdateLocation: isPending }) =>
        isPending
          ? this.props.renderConfirmation(
              () => {
                doResolvePendingUpdateLocation(false).run();
              },
              () => {
                doResolvePendingUpdateLocation(true).run();
              }
            )
          : null
    );
  }
}

export default queries(DirtyFormStatePrompt);
