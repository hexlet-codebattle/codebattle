import React, { memo } from 'react';

import cn from 'classnames';

import Loading from './Loading';

function EditorLoading({ loading }) {
    const loadingClassName = cn('position-absolute align-items-center justify-content-center w-100 h-100', {
      'd-flex cb-loading-background': loading,
      'd-none': !loading,
    });

    return <div className={loadingClassName}><Loading /></div>;
}

export default memo(EditorLoading);
