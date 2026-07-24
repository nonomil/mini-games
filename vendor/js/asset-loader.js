(function (global) {
    'use strict';

    const jsonPromises = new Map();

    function resolveAssetUrl(path) {
        return typeof global.resolvePetBankAssetUrl === 'function'
            ? global.resolvePetBankAssetUrl(path)
            : path;
    }

    function fetchJson(path, options) {
        const resolvedUrl = resolveAssetUrl(path);
        if (jsonPromises.has(resolvedUrl)) return jsonPromises.get(resolvedUrl);

        const promise = fetch(resolvedUrl, options)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`[PetBankAssetLoader] ${response.status} ${response.statusText || 'request failed'}: ${resolvedUrl}`);
                }
                return response.json();
            })
            .catch((error) => {
                jsonPromises.delete(resolvedUrl);
                throw error;
            });

        jsonPromises.set(resolvedUrl, promise);
        return promise;
    }

    global.PetBankAssetLoader = Object.freeze({ fetchJson });
})(window);
