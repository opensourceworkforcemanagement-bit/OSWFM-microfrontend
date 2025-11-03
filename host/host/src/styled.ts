import styled from "styled-components";

export const AppContainer = styled.div`
  display:flex;
  min-height:100vh;
  @media (max-width:768px){ flex-direction:column; }
`;
export const Sidebar = styled.aside`
  width:220px; background:#222; color:white; padding:1rem;
  @media (max-width:768px){ display:none; }
`;
export const Topbar = styled.header`
  display:none; background:#111; color:white; padding:0.75rem;
  @media (max-width:768px){ display:flex; }
`;
export const Content = styled.main`
  flex:1; padding:2rem;
  @media (max-width:768px){ padding:1rem; }
  @media (max-width:480px){ padding:0.75rem; button{ width:100%; } }
`;
