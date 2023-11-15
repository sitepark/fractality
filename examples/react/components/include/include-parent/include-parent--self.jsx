import React from 'react';
import PropTypes from 'prop-types';

// TODO: it should be possible to import components by handles
import IncludeChild from '../include-child/include-child.jsx';

const IncludeParentSelf = (props) => {
    return (
        <>
            {props._self.handle}
            <IncludeChild />
            {props._self.handle}
        </>
    );
};

IncludeParentSelf.propTypes = {
    _self: PropTypes.shape({
        handle: PropTypes.string,
    }),
};

export default IncludeParentSelf;
