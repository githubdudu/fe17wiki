/**
 *  @param {{ sidebar?: import('react').ReactNode, children?: import('react').ReactNode }} props
 **/
function NavLayout({ sidebar, children }) {
  return (
    <div className="nav-layout">
      {/* NavLayout */}
      <Menu />
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}

export default NavLayout;

function Menu() {
  return <div>Menu</div>;
}
