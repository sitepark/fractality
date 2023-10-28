import React from "react";

import { usePath } from "@frctl/react/components";

const Path = () => {
    const path = usePath();
    return <>{path.get('/some-path')}</>;
};

export default Path;
