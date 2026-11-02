import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useRef,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
	const { isAuthenticated, user } = useAuth();
	const [socket, setSocket] = useState(null);
	const [isConnected, setIsConnected] = useState(false);
	const [boardPresence, setBoardPresence] = useState([]);
	const activeBoardIdRef = useRef(null);

	useEffect(() => {
		if (!isAuthenticated) {
			if (socket) {
				socket.disconnect();
				setSocket(null);
				setIsConnected(false);
			}
			return;
		}

		const token = localStorage.getItem('flowspace_token');
		const socketUrl =
			import.meta.env.VITE_SOCKET_URL ||
			import.meta.env.VITE_BACKEND_URL ||
			import.meta.env.VITE_BACKEND_URI ||
			undefined;

		const newSocket = io(socketUrl, {
			auth: { token },
			withCredentials: true,
			transports: ['websocket', 'polling'],
			reconnectionAttempts: 10,
			reconnectionDelay: 1000,
		});

		newSocket.on('connect', () => {
			console.log(
				'[Socket.IO] Connected to collaboration gateway:',
				newSocket.id,
			);
			setIsConnected(true);

			// Re-join active board if reconnected
			if (activeBoardIdRef.current) {
				newSocket.emit('board:join', { boardId: activeBoardIdRef.current });
			}
		});

		newSocket.on('disconnect', (reason) => {
			console.log('[Socket.IO] Disconnected:', reason);
			setIsConnected(false);
			setBoardPresence([]);
		});

		newSocket.on('presence:updated', ({ boardId, activeUsers }) => {
			if (activeBoardIdRef.current === boardId) {
				setBoardPresence(activeUsers || []);
			}
		});

		setSocket(newSocket);

		return () => {
			newSocket.disconnect();
		};
	}, [isAuthenticated, user?.id]);

	const joinBoard = (boardId) => {
		if (!socket || !boardId) return;
		activeBoardIdRef.current = boardId;
		socket.emit('board:join', { boardId }, (response) => {
			if (response && response.activeUsers) {
				setBoardPresence(response.activeUsers);
			}
		});
	};

	const leaveBoard = (boardId) => {
		if (!socket || !boardId) return;
		if (activeBoardIdRef.current === boardId) {
			activeBoardIdRef.current = null;
			setBoardPresence([]);
		}
		socket.emit('board:leave', { boardId });
	};

	return (
		<SocketContext.Provider
			value={{
				socket,
				isConnected,
				boardPresence,
				joinBoard,
				leaveBoard,
			}}
		>
			{children}
		</SocketContext.Provider>
	);
};

export const useSocket = () => {
	const context = useContext(SocketContext);
	if (!context)
		throw new Error('useSocket must be used within a SocketProvider');
	return context;
};
