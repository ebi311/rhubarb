'use client';

import React, { createContext, PropsWithChildren, useReducer } from 'react';

type PageContextType = {
	title: string;
};

export const pageContext = createContext<PageContextType>({ title: '' });

type ActionTypes = {
	type: 'SET_TITLE';
	payload: string;
};

const reducer = (
	state: PageContextType,
	action: ActionTypes,
): PageContextType => {
	switch (action.type) {
		case 'SET_TITLE':
			return { ...state, title: action.payload };
		default:
			return state;
	}
};

export const pageDispatchContext = createContext<{
	state: PageContextType;
	dispatch: React.Dispatch<ActionTypes>;
}>({
	state: {
		title: '',
	},
	dispatch: () => null,
});

export const PageContextProvider: React.FC<PropsWithChildren> = ({
	children,
}) => {
	const [state, dispatch] = useReducer(reducer, { title: '' });
	return (
		<pageContext.Provider value={state}>
			<pageDispatchContext.Provider value={{ state, dispatch }}>
				{children}
			</pageDispatchContext.Provider>
		</pageContext.Provider>
	);
};

export const useSetPageTitle = (title: string) => {
	const { dispatch } = React.useContext(pageDispatchContext);
	React.useEffect(() => {
		dispatch({ type: 'SET_TITLE', payload: title });
	}, [dispatch, title]);
};

export const PageTitle: React.FC<{ title: string }> = ({ title }) => {
	useSetPageTitle(title);
	return null;
};
